export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  primary: string;
  primaryLight: string;
  text: string;
  textSecondary: string;
  border: string;
  bubbleSender: string;
  bubbleReceiver: string;
  bubbleSenderText: string;
  bubbleReceiverText: string;
  accent: string;
  danger: string;
  success: string;
  tickSingle: string;
  tickDouble: string;
  tickBlue: string;
}

export const lightTheme: ThemeColors = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  primary: '#075E54',
  primaryLight: '#128C7E',
  text: '#111B21',
  textSecondary: '#667781',
  border: '#E9EDEF',
  bubbleSender: '#D9FDD3',
  bubbleReceiver: '#FFFFFF',
  bubbleSenderText: '#111B21',
  bubbleReceiverText: '#111B21',
  accent: '#25D366',
  danger: '#EA4335',
  success: '#34A853',
  tickSingle: '#8696A0',
  tickDouble: '#8696A0',
  tickBlue: '#53BDEB',
};

export const darkTheme: ThemeColors = {
  background: '#0C1317',
  surface: '#111B21',
  card: '#202C33',
  primary: '#00A884',
  primaryLight: '#005D4B',
  text: '#E9EDEF',
  textSecondary: '#8696A0',
  border: '#222D34',
  bubbleSender: '#005C4B',
  bubbleReceiver: '#202C33',
  bubbleSenderText: '#E9EDEF',
  bubbleReceiverText: '#E9EDEF',
  accent: '#00A884',
  danger: '#EF4444',
  success: '#10B981',
  tickSingle: '#8696A0',
  tickDouble: '#8696A0',
  tickBlue: '#53BDEB',
};
