import subprocess
import time
import sys
import os
import httpx

# Ensure we run from the correct directory containing app/
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Delete existing test SQLite database to start fresh
if os.path.exists("api.db"):
    try:
        os.remove("api.db")
        print("[-] Removed old test database api.db")
    except Exception as e:
        print(f"[!] Warning: Could not remove old test database: {e}")

print("[*] Running database migrations...")
try:
    from alembic.config import main
    # Alembic main() will run the command
    main(argv=["upgrade", "head"])
    print("[+] Database migrations executed successfully.")
except Exception as migration_error:
    print(f"Programmatic migrations encountered an issue: {migration_error}. Trying Scripts directory fallback...")
    alembic_path = os.path.join(os.path.dirname(sys.executable), "Scripts", "alembic.exe")
    if os.path.exists(alembic_path):
        try:
            subprocess.run([alembic_path, "upgrade", "head"], check=True)
            print("[+] Database migrations executed successfully via Scripts fallback.")
        except Exception as e:
            print(f"[!] Scripts fallback failed: {e}. Uvicorn will sync tables dynamically via Base.metadata.create_all.")
    else:
        print("[!] Warning: Alembic path not found. Uvicorn will dynamically sync tables on startup via Base.metadata.create_all.")

print("[*] Starting FastAPI server on port 8000...")
# Launch uvicorn server in a separate background process
server_proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--log-level", "info"],
    text=True
)

# Wait for server to boot up
time.sleep(3.0)

# Check if server process crashed immediately
if server_proc.poll() is not None:
    print("[!] Uvicorn failed to start. Logs:")
    out, err = server_proc.communicate()
    print("STDOUT:", out)
    print("STDERR:", err)
    sys.exit(1)

print("[+] Server started successfully. Running test suite...")

BASE_URL = "http://127.0.0.1:8000"
test_email = "developer@example.com"
test_password = "supersecurepassword1"
api_key = None
new_api_key = None

try:
    with httpx.Client() as client:
        # 1. Test User Registration
        print("\n[Test 1] Registering User...")
        reg_payload = {"email": test_email, "password": test_password}
        reg_response = client.post(f"{BASE_URL}/register", json=reg_payload)
        assert reg_response.status_code == 201, f"Failed registration: {reg_response.text}"
        
        reg_data = reg_response.json()
        api_key = reg_data["api_key"]
        print(f"  - Registered user: {reg_data['user']['email']}")
        print(f"  - Received API key: {api_key}")
        
        # 2. Test Live Chat Completion
        print("\n[Test 2] Querying Chat Endpoint (/v1/chat) with API Key...")
        headers = {"Authorization": f"Bearer {api_key}"}
        chat_payload = {
            "messages": [
                {"role": "user", "content": "How does gradient descent work?"}
            ]
        }
        chat_response = client.post(f"{BASE_URL}/v1/chat", json=chat_payload, headers=headers)
        assert chat_response.status_code == 200, f"Failed chat: {chat_response.text}"
        
        chat_data = chat_response.json()
        print(f"  - AI Response: {chat_data['choices'][0]['message']['content']}")
        print(f"  - Tokens Used: Prompt={chat_data['usage']['prompt_tokens']}, Completion={chat_data['usage']['completion_tokens']}")
        
        # 2a. Test Streaming
        print("\n[Test 2a] Testing Streaming Endpoint...")
        stream_payload = {
            "model": "mock",
            "messages": [{"role": "user", "content": "Stream me"}]
        }
        with client.stream("POST", f"{BASE_URL}/v1/chat/stream", json=stream_payload, headers=headers) as stream_resp:
            assert stream_resp.status_code == 200, f"Stream failed: {stream_resp.status_code}"
            stream_content = stream_resp.read().decode()
            print("  - Stream response read successfully.")
            assert "data: " in stream_content, "Stream did not contain SSE data!"

        # 2b. Test Conversation Memory
        print("\n[Test 2b] Testing Conversation Memory...")
        sess_id = "test-session-123"
        mem1_payload = {
            "model": "mock",
            "messages": [{"role": "user", "content": "My name is Alice"}],
            "session_id": sess_id
        }
        client.post(f"{BASE_URL}/v1/chat", json=mem1_payload, headers=headers)
        
        mem2_payload = {
            "model": "mock",
            "messages": [{"role": "user", "content": "What is my name?"}],
            "session_id": sess_id
        }
        mem2_resp = client.post(f"{BASE_URL}/v1/chat", json=mem2_payload, headers=headers)
        mem2_data = mem2_resp.json()
        print(f"  - Memory Response: {mem2_data['choices'][0]['message']['content']}")
        assert "Alice" in mem2_data['choices'][0]['message']['content'], "Memory failed!"

        # 3. Test Usage Endpoint
        print("\n[Test 3] Retrieving API Usage Info (/v1/usage)...")
        usage_response = client.get(f"{BASE_URL}/v1/usage", headers=headers)
        assert usage_response.status_code == 200, f"Failed usage check: {usage_response.text}"
        
        usage_data = usage_response.json()
        print(f"  - Total Requests Made: {usage_data['total_requests']}")
        print(f"  - Daily Limit Allowed: {usage_data['limit']}")
        print(f"  - Remaining Quota: {usage_data['remaining_requests']}")
        
        # 4. Test Key Regeneration
        print("\n[Test 4] Regenerating API Key (/v1/regenerate-key)...")
        regen_response = client.post(f"{BASE_URL}/v1/regenerate-key", headers=headers)
        assert regen_response.status_code == 200, f"Failed regeneration: {regen_response.text}"
        
        regen_data = regen_response.json()
        new_api_key = regen_data["new_api_key"]
        print(f"  - Revoked old key prefix: {api_key[:9]}")
        print(f"  - Generated new API Key: {new_api_key}")
        
        # 5. Test Old Key Access Denied
        print("\n[Test 5] Verifying Old Key is Revoked...")
        old_key_response = client.post(f"{BASE_URL}/v1/chat", json=chat_payload, headers={"Authorization": f"Bearer {api_key}"})
        print(f"  - Response status: {old_key_response.status_code}")
        print(f"  - Response body: {old_key_response.json()['detail']}")
        assert old_key_response.status_code == 401, "Expected 401 Unauthorized for revoked key!"
        
        # 6. Test New Key Access Accepted
        print("\n[Test 6] Verifying New Key is Active...")
        new_key_response = client.post(f"{BASE_URL}/v1/chat", json=chat_payload, headers={"Authorization": f"Bearer {new_api_key}"})
        assert new_key_response.status_code == 200, f"Failed chat with new key: {new_key_response.text}"
        print(f"  - Success! Chat response received using new key.")
        
        # 8. Test System Prompt
        print("\n[Test 8] Setting Custom System Prompt...")
        sys_payload = {"system_prompt": "You are a helpful pirate."}
        sys_resp = client.post(f"{BASE_URL}/v1/system-prompt", json=sys_payload, headers={"Authorization": f"Bearer {new_api_key}"})
        assert sys_resp.status_code == 200, "Failed to set system prompt"
        
        chat_sys_resp = client.post(f"{BASE_URL}/v1/chat", json={"model": "mock", "messages": [{"role": "user", "content": "Hello"}]}, headers={"Authorization": f"Bearer {new_api_key}"})
        assert "helpful pirate" in chat_sys_resp.json()['choices'][0]['message']['content'], "System prompt was not prepended!"
        print("  - System prompt successfully applied.")

        # 9. Test Tier Restrictions
        print("\n[Test 9] Verifying Tier Restrictions (Free user trying Premium model)...")
        tier_payload = {"model": "claude-3-haiku-20240307", "messages": [{"role": "user", "content": "Hi"}]}
        tier_resp = client.post(f"{BASE_URL}/v1/chat", json=tier_payload, headers={"Authorization": f"Bearer {new_api_key}"})
        print(f"  - Response status: {tier_resp.status_code}")
        assert tier_resp.status_code == 403, "Free user should be forbidden from using premium models!"

        # 10. Test Webhook Registration
        print("\n[Test 10] Registering Webhook...")
        webhook_resp = client.post(f"{BASE_URL}/v1/webhooks/register", json={"webhook_url": "http://localhost:9999/webhook"}, headers={"Authorization": f"Bearer {new_api_key}"})
        assert webhook_resp.status_code == 200, "Failed to register webhook"
        print("  - Webhook registered successfully.")

        # 11. Test Detailed Usage Endpoint
        print("\n[Test 11] Retrieving Detailed Usage...")
        detailed_resp = client.get(f"{BASE_URL}/v1/usage/detailed", headers={"Authorization": f"Bearer {new_api_key}"})
        assert detailed_resp.status_code == 200, "Failed to get detailed usage"
        detailed_data = detailed_resp.json()
        print(f"  - Total Cost: ${detailed_data['total_estimated_cost_usd']}")
        print(f"  - Breakdown: {detailed_data['usage_by_model']}")

        # 12. Test RAG System Endpoints
        print("\n[Test 12] Testing RAG System (Upload, Vector Query, De-indexing)...")
        file_payload = {
            "file": (
                "rag_test_doc.txt",
                b"Your Own API is a production-grade AI platform built with FastAPI, PostgreSQL, Redis, React, and modular multi-model routing. It supports unified chat, document RAG, Stable Diffusion image generation, and audio TTS/STT.",
                "text/plain"
            )
        }
        upload_resp = client.post(f"{BASE_URL}/v1/rag/upload", files=file_payload, headers={"Authorization": f"Bearer {new_api_key}"})
        assert upload_resp.status_code == 201, f"Failed document upload: {upload_resp.text}"
        doc_data = upload_resp.json()
        doc_id = doc_data["id"]
        assert doc_data["filename"] == "rag_test_doc.txt", "Incorrect uploaded filename"
        assert doc_data["status"] == "indexed", "Document status should be 'indexed'"
        assert doc_data["chunk_count"] > 0, "Chunk count should be > 0"
        print(f"  - Successfully indexed RAG document ID {doc_id} with {doc_data['chunk_count']} chunks.")

        # Test querying RAG
        query_payload = {
            "query": "What technologies are used in Your Own API?",
            "document_ids": [doc_id],
            "model": "mock"
        }
        query_resp = client.post(f"{BASE_URL}/v1/rag/query", json=query_payload, headers={"Authorization": f"Bearer {new_api_key}"})
        assert query_resp.status_code == 200, f"RAG query failed: {query_resp.text}"
        query_data = query_resp.json()
        assert len(query_data["citations"]) > 0, "Query should return at least one citation"
        assert query_data["citations"][0]["filename"] == "rag_test_doc.txt", "Citation filename mismatch"
        print(f"  - Vector space matched query with {query_data['citations'][0]['score']*100:.0f}% confidence.")
        print(f"  - AI Synthesized Answer: {query_data['answer']}")

        # Test listing RAG documents
        list_resp = client.get(f"{BASE_URL}/v1/rag/documents", headers={"Authorization": f"Bearer {new_api_key}"})
        assert list_resp.status_code == 200, f"Failed to list documents: {list_resp.text}"
        assert any(d["id"] == doc_id for d in list_resp.json()), "Uploaded document missing in library list"
        print("  - Document successfully retrieved from library registry.")

        # Test deleting document
        del_resp = client.delete(f"{BASE_URL}/v1/rag/documents/{doc_id}", headers={"Authorization": f"Bearer {new_api_key}"})
        assert del_resp.status_code == 200, f"Failed to delete document: {del_resp.text}"
        
        # Verify it's gone
        list_resp_after = client.get(f"{BASE_URL}/v1/rag/documents", headers={"Authorization": f"Bearer {new_api_key}"})
        assert not any(d["id"] == doc_id for d in list_resp_after.json()), "Document was not de-indexed successfully"
        print("  - Vector workspace cleared and document de-indexed successfully.")

    print("\n==============================================")
    print("=== ALL TESTS PASSED SUCCESSFULLY! Ready to Run! ===")
    print("==============================================")

except AssertionError as e:
    print(f"\n[!] Assertion Failed: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n[!] Unexpected Error during test execution: {e}")
    sys.exit(1)
finally:
    # Cleanup: Terminate background server process
    print("\n[*] Stopping server...")
    server_proc.terminate()
    try:
        server_proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server_proc.kill()
    print("[-] Server stopped.")
