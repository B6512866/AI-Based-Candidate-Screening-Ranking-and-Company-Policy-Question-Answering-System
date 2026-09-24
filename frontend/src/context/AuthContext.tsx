import { createContext, useContext, useState } from "react";

interface AuthContextType {
    token: string | null;
    role: string | null;
    firstName: string | null;
    lastName: string | null;
    login: (token: string, role: string, firstName: string, lastName: string) => void;
    logout: () => void;
    updateUser: (firstName: string, lastName: string) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [role, setRole] = useState<string | null>(localStorage.getItem("role"));
    const [firstName, setFirstName] = useState<string | null>(localStorage.getItem("firstName"));
    const [lastName, setLastName] = useState<string | null>(localStorage.getItem("lastName"));

    const login = (newToken: string, newRole: string, newFirstName: string, newLastName: string) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem("role", newRole);
        localStorage.setItem("firstName", newFirstName);
        localStorage.setItem("lastName", newLastName);
        setToken(newToken);
        setRole(newRole);
        setFirstName(newFirstName);
        setLastName(newLastName);
    };

    const updateUser = (newFirstName: string, newLastName: string) => {
        localStorage.setItem("firstName", newFirstName);
        localStorage.setItem("lastName", newLastName);
        setFirstName(newFirstName);
        setLastName(newLastName);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("firstName");
        localStorage.removeItem("lastName");
        setToken(null);
        setRole(null);
        setFirstName(null);
        setLastName(null);
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ token, role, firstName, lastName, login, logout, updateUser, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
