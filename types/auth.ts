export type SignupFormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string; email?: string }
  | { status: "error"; message: string; email?: string };

export const initialState: SignupFormState = { status: "idle" };
