export interface User {
  id: number;
  name: string;
  lastname: string;
  email: string;
  password: string;
  profile_type: 'personal' | 'company';
  email_verified_at: string | null;
  email_verification_code: string | null;
  email_verification_expires_at: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  document_selfie_url: string | null;
  documents_submitted_at: string | null;
  documents_verified_at: string | null;
  password_reset_token?: string | null;
  password_reset_expires_at?: Date | null;
  created_at: string;
  updated_at: string;
}

export interface Manager {
  id: number;
  name: string;
  telegram_chat_id: string;
  created_at: string;
  updated_at: string;
}
