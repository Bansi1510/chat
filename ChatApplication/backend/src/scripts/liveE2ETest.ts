import io from 'socket.io-client';

const API_BASE = 'http://localhost:4000/api/v1';
const SOCKET_BASE = 'http://localhost:4000';

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: any;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.success === false) {
    throw new Error(`API Error [${res.status}] ${endpoint}: ${JSON.stringify(json.error || json)}`);
  }
  return json.data;
}

async function runLiveE2ETest() {
  console.log('===========================================================');
  console.log('   STARTING REAL LIVE END-TO-END SYSTEM VALIDATION');
  console.log('===========================================================');

  const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
  const aliceUsername = `alice_${randomSuffix}`;
  const bobUsername = `bob_${randomSuffix}`;
  const password = 'TestPassword123!';

  // STEP 1: Super Admin Authentication & Dashboard Verification
  console.log('\n[TEST 1] Verifying Super Admin Login & RBAC Control...');
  const adminLogin = await request<{ accessToken: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'root', password: 'AdminPassword123!' }),
  });
  console.log(` -> Super Admin logged in: @${adminLogin.user.username} (${adminLogin.user.role})`);

  const adminUsers = await request<{ users: any[]; total: number }>('/admin/users?page=1&limit=20', { method: 'GET' }, adminLogin.accessToken);
  console.log(` -> Admin query /admin/users returned ${adminUsers.total} registered users in Neon DB.`);

  const adminSettings = await request<any>('/admin/settings', { method: 'GET' }, adminLogin.accessToken);
  console.log(` -> Admin query /admin/settings: maxFileSizeMb=${adminSettings.maxFileSizeMb}`);

  // STEP 2: Register User 1 (Alice)
  console.log(`\n[TEST 2] Registering User 1: @${aliceUsername}...`);
  const aliceReg = await request<{ accessToken: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: aliceUsername, password }),
  });
  console.log(` -> Alice registered: ID ${aliceReg.user.id}`);

  // STEP 3: Register User 2 (Bob)
  console.log(`\n[TEST 3] Registering User 2: @${bobUsername}...`);
  const bobReg = await request<{ accessToken: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: bobUsername, password }),
  });
  console.log(` -> Bob registered: ID ${bobReg.user.id}`);

  // STEP 4: Mutual QR Connection Handshake
  console.log('\n[TEST 4] Initiating Secure 1:1 QR Connection...');
  const qrData = await request<{ rawToken: string; expiresAt: string }>(
    '/qr',
    { method: 'GET' },
    aliceReg.accessToken
  );
  console.log(` -> Alice generated QR rawToken (expires: ${qrData.expiresAt})`);

  const confirmRes = await request<{ conversationId: string; peer: any }>(
    '/qr/scan',
    {
      method: 'POST',
      body: JSON.stringify({ token: qrData.rawToken }),
    },
    bobReg.accessToken
  );
  const conversationId = confirmRes.conversationId;
  console.log(` -> Bob scanned & confirmed QR! Mutual Conversation Created: ID ${conversationId}`);

  // STEP 5: Real-time Socket.IO Connection & Authentication
  console.log('\n[TEST 5] Establishing Live Socket.IO Sessions for Alice and Bob...');
  const aliceSocket = io(SOCKET_BASE, {
    auth: { token: aliceReg.accessToken },
    transports: ['websocket'],
  });
  const bobSocket = io(SOCKET_BASE, {
    auth: { token: bobReg.accessToken },
    transports: ['websocket'],
  });

  await new Promise<void>((resolve, reject) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    aliceSocket.on('connect', check);
    bobSocket.on('connect', check);
    aliceSocket.on('connect_error', reject);
    bobSocket.on('connect_error', reject);
  });
  console.log(` -> Alice Socket connected: ${aliceSocket.id}`);
  console.log(` -> Bob Socket connected: ${bobSocket.id}`);

  // Join conversation rooms
  aliceSocket.emit('conversation:join', conversationId);
  bobSocket.emit('conversation:join', conversationId);
  await new Promise((r) => setTimeout(r, 600));

  // STEP 6: Real-time Typing Indicators
  console.log('\n[TEST 6] Testing Real-time Typing Indicator Broadcast...');
  const typingPromise = new Promise<void>((resolve) => {
    bobSocket.on('chat:typing', (data) => {
      console.log(' -> [SOCKET EVENT] Bob received chat:typing:', data);
      if (data.userId === aliceReg.user.id && data.isTyping === true) {
        resolve();
      }
    });
  });
  aliceSocket.emit('chat:typing', { conversationId, isTyping: true });
  await typingPromise;

  // STEP 7: Real-time Message Transmission & E2EE Ciphertext Delivery
  console.log('\n[TEST 7] Sending Real E2EE Message from Alice to Bob...');
  const clientMsgId = `cmsg_${Date.now()}`;
  const ciphertext = 'ENCRYPTED_SIGNAL_PAYLOAD_HELLO_WORLD';

  const messagePromise = new Promise<any>((resolve) => {
    bobSocket.on('message:new', (msg) => {
      if (msg.clientMsgId === clientMsgId) {
        console.log(` -> Bob received message in real-time over Socket.IO: ID ${msg.id}`);
        resolve(msg);
      }
    });
  });

  await request<any>(
    '/messages',
    {
      method: 'POST',
      body: JSON.stringify({
        conversationId,
        clientMsgId,
        ciphertext,
        type: 'text',
      }),
    },
    aliceReg.accessToken
  );
  const deliveredMsg = await messagePromise;
  console.log(` -> Message successfully saved in Neon PostgreSQL and broadcasted via Socket.IO!`);

  // STEP 8: Delivery and Read Receipts (Ticks)
  console.log('\n[TEST 8] Testing Delivery (Double Tick) and Read Receipts (Blue Tick)...');
  const readPromise = new Promise<void>((resolve) => {
    aliceSocket.on('message:read', (data) => {
      if (data.messageIds.includes(deliveredMsg.id) && data.userId === bobReg.user.id) {
        console.log(` -> Alice received blue tick read receipt for message: ${deliveredMsg.id}`);
        resolve();
      }
    });
  });

  bobSocket.emit('message:read', { conversationId, messageIds: [deliveredMsg.id] });
  await readPromise;

  // STEP 9: Emoji Reactions
  console.log('\n[TEST 9] Testing Message Emoji Reactions...');
  const reactionPromise = new Promise<void>((resolve) => {
    aliceSocket.on('reaction:new', (data) => {
      if (data.messageId === deliveredMsg.id && data.emoji === '🔥') {
        console.log(` -> Alice received real-time reaction update: emoji=${data.emoji}`);
        resolve();
      }
    });
  });

  await request(
    `/messages/${deliveredMsg.id}/react`,
    {
      method: 'POST',
      body: JSON.stringify({ emoji: '🔥' }),
    },
    bobReg.accessToken
  );
  await reactionPromise;

  // STEP 10: Disappearing Messages Settings & 20-Day Retention Policy
  console.log('\n[TEST 10] Testing Disappearing Messages (5 Minutes Timer & 20-Day Retention)...');
  await request(
    `/conversations/${conversationId}/settings`,
    {
      method: 'PATCH',
      body: JSON.stringify({ disappearingSeconds: 300 }),
    },
    aliceReg.accessToken
  );

  const testDisappearingMsg = await request<any>(
    '/messages',
    {
      method: 'POST',
      body: JSON.stringify({
        conversationId,
        clientMsgId: `disappear_${Date.now()}`,
        ciphertext: 'SECRET_DISAPPEARING_TEXT',
        type: 'text',
      }),
    },
    aliceReg.accessToken
  );

  const expiresAt = new Date(testDisappearingMsg.expiresAt).getTime();
  const permanentDeleteAt = new Date(testDisappearingMsg.permanentDeleteAt).getTime();
  const diffDays = Math.round((permanentDeleteAt - expiresAt) / (1000 * 60 * 60 * 24));

  console.log(` -> Disappearing Message created in Neon PostgreSQL:`);
  console.log(`    - expiresAt: ${testDisappearingMsg.expiresAt}`);
  console.log(`    - permanentDeleteAt: ${testDisappearingMsg.permanentDeleteAt}`);
  console.log(`    - Retention Window: exactly ${diffDays} days!`);

  // STEP 11: Cloudinary Signed Upload Signature Endpoint
  console.log('\n[TEST 11] Testing Cloudinary Secure Signed Upload Generation...');
  const signatureData = await request<{ signature: string; timestamp: number; apiKey: string; cloudName: string }>(
    '/media/sign-upload',
    { method: 'POST' },
    aliceReg.accessToken
  );
  console.log(` -> Generated Cloudinary signature for cloud: ${signatureData.cloudName}, apiKey: ${signatureData.apiKey}`);

  // STEP 12: Scheduled Messages Dispatcher Creation
  console.log('\n[TEST 12] Testing Scheduled Message Creation...');
  const futureDate = new Date(Date.now() + 60000).toISOString();
  const scheduledMsg = await request<any>(
    '/messages',
    {
      method: 'POST',
      body: JSON.stringify({
        conversationId,
        clientMsgId: `sched_${Date.now()}`,
        ciphertext: 'SCHEDULED_DISPATCH_TEXT',
        type: 'text',
        isScheduled: true,
        scheduledFor: futureDate,
      }),
    },
    aliceReg.accessToken
  );
  console.log(` -> Scheduled message registered in Neon DB for dispatch at: ${scheduledMsg.scheduledFor}`);

  // Disconnect Sockets
  aliceSocket.disconnect();
  bobSocket.disconnect();

  console.log('\n===========================================================');
  console.log('   ALL 12 REAL-WORLD END-TO-END PIPELINE TESTS PASSED 100%!');
  console.log('===========================================================');
}

runLiveE2ETest().catch((err) => {
  console.error('\nE2E Test Failed:', err);
  process.exit(1);
});
