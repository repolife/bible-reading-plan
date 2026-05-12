import { supabase } from "../supabaseClient";
import { useState } from "react";

const SignupForm = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) setError(error.message);
    else window.location.href = "/onboarding"; // Redirect after signup
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSignup();
      }}
    >
      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        placeholder="Email"
      />
      <input
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        placeholder="Password"
      />
      <button type="submit">Sign Up</button>
      {error && <p>{error}</p>}
    </form>
  );
};
