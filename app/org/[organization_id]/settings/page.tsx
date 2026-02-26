"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store/useAuthStore";

export default function Page() {
  const { setTheme, theme } = useTheme();
  // const { colorScheme, setColorScheme } = useAuthStore(state => state.memberships);

  const themes = [
    { name: "Blue", value: "theme-blue", color: "bg-blue-600" },
    { name: "Green", value: "theme-green", color: "bg-green-600" },
    { name: "Red", value: "theme-red", color: "bg-red-600" },
    { name: "Violet", value: "theme-violet", color: "bg-violet-600" },
    { name: "Orange", value: "theme-orange", color: "bg-orange-600" },
    { name: "Zinc", value: "theme-zinc", color: "bg-zinc-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-aceverse-navy dark:text-aceverse-ice">Settings</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the appearance of the application. Automatically switch between day and night themes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Theme Mode</h3>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="w-32 justify-start"
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="w-32 justify-start"
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  onClick={() => setTheme("system")}
                  className="w-32 justify-start"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Color Scheme</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {themes.map((t) => (
                  <Button
                    key={t.value}
                    variant={colorScheme === t.value ? "default" : "outline"}
                    onClick={() => setColorScheme(t.value)}
                    className="justify-start w-full"
                  >
                    <div className={`mr-2 h-4 w-4 rounded-full ${t.color}`} />
                    {t.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
