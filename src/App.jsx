import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  async function ensureAllowed() {
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email')
      .maybeSingle();

    if (error) {
      console.error(error);
      alert('Temporary issue verifying access.');
      return false;
    }
    if (!data) {
      alert('Access denied. Contact the admin for access.');
      await supabase.auth.signOut();
      return false;
    }
    setIsAllowed(true);
    return true;
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) await ensureAllowed();
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) await ensureAllowed();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value
    });
  };

  const signIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });

    setLoading(false);
    
    if (error) {
      alert(error.message);
    }
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
    <div style={{ fontFamily: "sans-serif", padding: 24, maxWidth: "800px", margin: "0 auto" }}>
      <h1>Moods Admin</h1>

      {!user ? (
        <div style={{ 
          border: "1px solid #ddd", 
          borderRadius: "8px", 
          padding: "20px", 
          maxWidth: "400px",
          margin: "40px auto"
        }}>
          <h2 style={{ marginTop: 0 }}>Sign In</h2>
          <form onSubmit={signIn}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px" }}>Email</label>
              <input
                type="email"
                name="email"
                value={loginForm.email}
                onChange={handleInputChange}
                style={{ 
                  width: "100%", 
                  padding: "8px", 
                  borderRadius: "4px", 
                  border: "1px solid #ccc" 
                }}
                required
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px" }}>Password</label>
              <input
                type="password"
                name="password"
                value={loginForm.password}
                onChange={handleInputChange}
                style={{ 
                  width: "100%", 
                  padding: "8px", 
                  borderRadius: "4px", 
                  border: "1px solid #ccc" 
                }}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                background: "#0070f3", 
                color: "white", 
                border: "none", 
                padding: "10px 15px", 
                borderRadius: "4px", 
                cursor: "pointer",
                width: "100%"
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "20px",
            padding: "10px",
            background: "#f5f5f5",
            borderRadius: "4px"
          }}>
            <div>
              <strong>Logged in as:</strong> {user.email}
            </div>
            <button 
              onClick={() => supabase.auth.signOut()}
              style={{ 
                background: "#f44336", 
                color: "white", 
                border: "none", 
                padding: "8px 12px", 
                borderRadius: "4px", 
                cursor: "pointer" 
              }}
            >
              Sign out
            </button>
          </div>
          
          {isAllowed && (
            <>
              <div style={{ marginBottom: 20 }}>
                <button 
                  onClick={load} 
                  style={{ 
                    background: "#0070f3", 
                    color: "white", 
                    border: "none", 
                    padding: "8px 12px", 
                    borderRadius: "4px", 
                    cursor: "pointer",
                    marginRight: "10px"
                  }}
                >
                  Load projects
                </button>
                <button 
                  onClick={add}
                  style={{ 
                    background: "#4caf50", 
                    color: "white", 
                    border: "none", 
                    padding: "8px 12px", 
                    borderRadius: "4px", 
                    cursor: "pointer" 
                  }}
                >
                  Add project
                </button>
              </div>
              
              <div style={{ 
                border: "1px solid #ddd", 
                borderRadius: "8px", 
                padding: "20px"
              }}>
                <h2>Projects</h2>
                {projects.length === 0 ? (
                  <p>No projects found. Click "Load projects" to refresh or "Add project" to create one.</p>
                ) : (
                  <ul style={{ padding: 0 }}>
                    {projects.map(p => (
                      <li key={p.id} style={{ 
                        padding: "12px", 
                        borderBottom: "1px solid #eee",
                        listStyle: "none"
                      }}>
                        <strong>{p.name}</strong> — {p.status} — {new Date(p.updated_at).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
