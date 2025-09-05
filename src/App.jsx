import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import moodsLogo from "./img/moods_logo.png";

export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  
  // Track sign out state to prevent loops
  let signingOut = false;

  async function ensureAllowed() {
    if (signingOut) return false;
    
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email')
      .maybeSingle();

    if (error) {
      console.error('allowed_emails check failed:', error);
      alert('Temporary issue verifying access.');
      return false;
    }
    if (!data) {
      alert('Access denied. Contact the admin for access.');
      signingOut = true;
      await supabase.auth.signOut({ scope: 'global' });
      signingOut = false;
      return false;
    }
    setIsAllowed(true);
    return true;
  }

  useEffect(() => {
    // Strip old auth hash (magic link / resets)
    if (window.location.hash && window.location.hash.includes('access_token')) {
      const clean = window.location.origin + import.meta.env.BASE_URL;
      window.history.replaceState(null, '', clean);
    }

    // Initial user
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) await ensureAllowed();
    });

    // React to auth events
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          setUser(session?.user ?? null);
          if (session?.user) await ensureAllowed();
          break;

        case 'SIGNED_OUT':
          setUser(null);
          setIsAllowed(false);
          setProjects([]);
          break;

        default:
          setUser(session?.user ?? null);
      }
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

  const signOut = async () => {
    // 1) Ask Supabase to revoke all sessions for this user
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      console.error('Error signing out:', error);
      alert(error.message);
      return;
    }

    // 2) Belt-and-suspenders: remove any lingering sb-*-auth-token key
    try {
      const ref = new URL(import.meta.env.VITE_SUPABASE_URL).host.split('.')[0]; // e.g. pblvktlahxpalusyvoeq
      const key = `sb-${ref}-auth-token`;
      localStorage.removeItem(key);
      // also clear any legacy keys
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sb-') && k.endsWith('-auth-token')) localStorage.removeItem(k);
      });
    } catch { /* ignore */ }

    // 3) Reset local UI state (defensive; the SIGNED_OUT event will also do this)
    setUser(null);
    setIsAllowed(false);
    setProjects([]);

    // 4) Land on a clean URL at your app base
    const cleanUrl = window.location.origin + import.meta.env.BASE_URL; // https://grantdozier.github.io/moods/
    window.location.replace(cleanUrl);
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
    <div style={{ 
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif", 
      padding: 24, 
      maxWidth: "800px", 
      margin: "0 auto",
      color: "#333"
    }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        marginBottom: 32,
        justifyContent: !user ? "center" : "flex-start"
      }}>
        <img 
          src={moodsLogo} 
          alt="Moods Logo" 
          style={{ 
            height: "60px", 
            marginRight: "16px" 
          }} 
        />
        <h1 style={{ 
          margin: 0, 
          fontSize: "32px",
          fontWeight: 600,
          color: "#222"
        }}>
          Admin Portal
        </h1>
      </div>

      {!user ? (
        <div style={{ 
          border: "1px solid #e1e1e1", 
          borderRadius: "12px", 
          padding: "32px", 
          maxWidth: "400px",
          margin: "40px auto",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          background: "#fff"
        }}>
          <h2 style={{ 
            marginTop: 0, 
            marginBottom: "24px", 
            fontSize: "24px",
            fontWeight: 500,
            textAlign: "center",
            color: "#333"
          }}>
            Sign In
          </h2>
          <form onSubmit={signIn}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px"
              }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={loginForm.email}
                onChange={handleInputChange}
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  borderRadius: "6px", 
                  border: "1px solid #ddd",
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
                required
              />
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px",
                fontWeight: 500,
                fontSize: "14px"
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={loginForm.password}
                onChange={handleInputChange}
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  borderRadius: "6px", 
                  border: "1px solid #ddd",
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                background: "#4361ee", 
                color: "white", 
                border: "none", 
                padding: "14px", 
                borderRadius: "6px", 
                cursor: "pointer",
                width: "100%",
                fontSize: "16px",
                fontWeight: 500,
                transition: "background 0.2s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
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
            marginBottom: "24px",
            padding: "16px",
            background: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e9ecef"
          }}>
            <div>
              <strong>Logged in as:</strong> {user.email}
            </div>
            <button 
              onClick={signOut}
              style={{ 
                background: "#f44336", 
                color: "white", 
                border: "none", 
                padding: "10px 16px", 
                borderRadius: "6px", 
                cursor: "pointer",
                fontWeight: 500,
                transition: "background 0.2s ease"
              }}
            >
              Sign out
            </button>
          </div>
          
          {isAllowed && (
            <>
              <div style={{ marginBottom: 24 }}>
                <button 
                  onClick={load} 
                  style={{ 
                    background: "#4361ee", 
                    color: "white", 
                    border: "none", 
                    padding: "10px 16px", 
                    borderRadius: "6px", 
                    cursor: "pointer",
                    marginRight: "12px",
                    fontWeight: 500,
                    transition: "background 0.2s ease"
                  }}
                >
                  Load projects
                </button>
                <button 
                  onClick={add}
                  style={{ 
                    background: "#38b000", 
                    color: "white", 
                    border: "none", 
                    padding: "10px 16px", 
                    borderRadius: "6px", 
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "background 0.2s ease"
                  }}
                >
                  Add project
                </button>
              </div>
              
              <div style={{ 
                border: "1px solid #e1e1e1", 
                borderRadius: "12px", 
                padding: "24px",
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <h2 style={{ 
                  marginTop: 0,
                  marginBottom: "16px",
                  fontSize: "24px",
                  fontWeight: 500
                }}>
                  Projects
                </h2>
                {projects.length === 0 ? (
                  <p style={{ color: "#666" }}>
                    No projects found. Click "Load projects" to refresh or "Add project" to create one.
                  </p>
                ) : (
                  <ul style={{ 
                    padding: 0,
                    margin: 0
                  }}>
                    {projects.map(p => (
                      <li key={p.id} style={{ 
                        padding: "16px", 
                        borderBottom: "1px solid #eee",
                        listStyle: "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div>
                          <strong style={{ fontSize: "18px" }}>{p.name}</strong>
                          <div style={{ color: "#666", fontSize: "14px", marginTop: "4px" }}>
                            Status: {p.status || "Not set"}
                          </div>
                        </div>
                        <div style={{ color: "#888", fontSize: "14px" }}>
                          {new Date(p.updated_at).toLocaleString()}
                        </div>
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
