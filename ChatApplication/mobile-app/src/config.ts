/**
 * Global API and Socket configuration for Mobile App.
 *
 * NOTE FOR PHYSICAL ANDROID DEVICE:
 * When connecting a physical Android device via USB, run:
 *   adb reverse tcp:4000 tcp:4000
 * This forwards all requests from localhost:4000 on the phone to your development PC.
 *
 * If using an Android Emulator instead of a physical phone, change host to '10.0.2.2:4000'.
 */
export const SERVER_HOST = 'localhost:4000';
export const API_BASE_URL = `http://${SERVER_HOST}/api/v1`;
export const SOCKET_URL = `http://${SERVER_HOST}`;
