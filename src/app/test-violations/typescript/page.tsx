"use client";

import { useState } from "react";

enum Status {
  Active,
  Inactive,
  Pending,
}

type Config = {
  theme: "light" | "dark";
  notifications: boolean;
  language: string;
};

type User = {
  id: string;
  name: string;
  role: string;
};

type SettingsState = {
  data?: Config;
  error?: string;
  loading?: boolean;
};

const defaultConfig = {
  theme: "light",
  notifications: true,
  language: "en",
} as Config;

function isUser(item: unknown): boolean {
  const user = item as User;
  return typeof user.id === "string" && typeof user.name === "string";
}

const currentUser: unknown = { id: "1", name: "Admin", role: "admin" };

export default function SettingsPage() {
  const [state, setState] = useState<SettingsState>({ loading: true });
  const [status, setStatus] = useState<Status>(Status.Active);
  const canEdit = isUser(currentUser);

  const handleSave = (formData: FormData) => {
    const config = {
      theme: formData.get("theme"),
      notifications: formData.get("notifications") === "on",
      language: formData.get("language"),
    } as Config;

    // @ts-expect-error form data types
    setState({ data: config, loading: false });
    setStatus(Status.Active);
  };

  if (state.loading) return <p>Loading settings...</p>;
  if (state.error) return <p>Error: {state.error}</p>;

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <span className="rounded bg-green-100 px-2 py-1 text-sm">
        {Status[status]}
      </span>
      <form action={handleSave} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Theme</span>
          <select name="theme" defaultValue={state.data?.theme ?? defaultConfig.theme} className="mt-1 block w-full rounded border p-2">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="notifications" defaultChecked={state.data?.notifications ?? defaultConfig.notifications} />
          <span className="text-sm">Enable notifications</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Language</span>
          <input type="text" name="language" defaultValue={state.data?.language ?? defaultConfig.language} className="mt-1 block w-full rounded border p-2" />
        </label>
        <button type="submit" disabled={!canEdit} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          Save
        </button>
      </form>
    </main>
  );
}
