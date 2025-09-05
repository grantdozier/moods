import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    const email = prompt("Email for magic link:");
    if (!email) return;
    // Use absolute URL for redirect to ensure it works with GitHub Pages
    const redirectTo = 'https://grantdozier.github.io/moods/';
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    if (error) alert(error.message);
    else alert("Check your email for the sign-in link.");
  };

  const load = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) alert(error.message);
    else setProjects(data);
  };

  const add = async () => {
    const name = prompt("Project name:");
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("projects")
      .insert([{ name, owner_uid: user.id }]);
    if (error) alert(error.message);
    else load();
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Moods Admin</h1>

      {!user ? (
        <button onClick={signIn}>Sign in (magic link)</button>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => supabase.auth.signOut()}>Sign out</button>
            <button onClick={load} style={{ marginLeft: 8 }}>Load projects</button>
            <button onClick={add} style={{ marginLeft: 8 }}>Add project</button>
          </div>
          <ul>
            {projects.map(p => (
              <li key={p.id}>
                {p.name} — {p.status} — {new Date(p.updated_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
