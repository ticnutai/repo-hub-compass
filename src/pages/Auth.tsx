import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2 } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { display_name: signupName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("נרשמת בהצלחה! בדוק את האימייל שלך לאימות.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md border-2 border-accent">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-3">
            <Code2 className="h-7 w-7 text-accent-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">DevHub</CardTitle>
          <CardDescription>מנהל הפרויקטים שלך</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">כניסה</TabsTrigger>
              <TabsTrigger value="signup">הרשמה</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div><Label>אימייל</Label><Input className="mt-1" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required /></div>
                <div><Label>סיסמה</Label><Input className="mt-1" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required /></div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                  {loading ? "מתחבר..." : "כניסה"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div><Label>שם מלא</Label><Input className="mt-1" value={signupName} onChange={e => setSignupName(e.target.value)} required /></div>
                <div><Label>אימייל</Label><Input className="mt-1" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required /></div>
                <div><Label>סיסמה</Label><Input className="mt-1" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} /></div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                  {loading ? "נרשם..." : "הרשמה"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
