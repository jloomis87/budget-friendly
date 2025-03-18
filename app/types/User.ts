export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  id: string; // This is used interchangeably with uid in the app
} 