export interface User {
  id?: number;        // ReqRes returns id on register (not on login)
  email: string;
  name?: string;
  avatar?: string;
}

export interface LoginResponse {
  token: string;      // Returned by POST https://reqres.in/api/login
}

export interface RegisterResponse {
  id: number;         // Returned by POST https://reqres.in/api/register
  token: string;
}

/** What we store locally to keep the session */
export interface Session {
  token: string;
  user: User;
}
