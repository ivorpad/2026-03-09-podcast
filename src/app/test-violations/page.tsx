"use client";
// test violation page - v4
import { useState, useEffect } from "react";

export default function TestPage() {
  const [data, setData] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/trpc/contacts.list")
      .then((r) => r.json())
      .then((d) => setData(d));
  }, []);

  return (
    <div>
      {data.map((item, i) => (
        <p key={i}>{item}</p>
      ))}
    </div>
  );
}
