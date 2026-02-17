"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);

  // Load user FIRST
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      setUser(data.user);
      setLoading(false);
    };

    loadUser();
  }, []);

  // Fetch bookmarks ONLY when user is ready
  useEffect(() => {
    if (!user) return;

    fetchBookmarks();

    const channel = supabase
      .channel("bookmarks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${user.id}`, // 🔥 only this user's changes
        },
        () => fetchBookmarks()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const fetchBookmarks = async () => {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id) // 🔥 PRIVATE
      .order("created_at", { ascending: false });

    setBookmarks(data || []);
  };

  const addBookmark = async () => {
    if (!title || !url) return;

    await supabase.from("bookmarks").insert({
      title,
      url,
      user_id: user.id,
    });
    fetchBookmarks();

    setTitle("");
    setUrl("");
  };

  const deleteBookmark = async (id) => {
    await supabase.from("bookmarks").delete().eq("id", id);
    fetchBookmarks();

  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10">
      {/* Header */}
      <div className="flex justify-between mb-8">
        <h1 className="text-3xl font-bold">📚 Smart Bookmarks</h1>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      {/* Add Bookmark Form */}
      <div className="flex gap-3 mb-8">
        <input
          className="border p-3 flex-1 rounded"
          placeholder="Bookmark Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-3 flex-1 rounded"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={addBookmark}
          className="bg-black text-white px-6 rounded"
        >
          Add
        </button>
      </div>

      {/* Bookmark Table */}
      <table className="w-full border shadow-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 border text-left">Title</th>
            <th className="p-3 border text-left">URL</th>
            <th className="p-3 border text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {bookmarks.length === 0 && (
            <tr>
              <td colSpan="3" className="text-center p-6">
                No bookmarks added yet
              </td>
            </tr>
          )}

          {bookmarks.map((b) => (
            <tr key={b.id} className="hover:bg-gray-50">
              <td className="p-3 border font-semibold">{b.title}</td>
              <td className="p-3 border">
                <a
                  href={b.url}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  {b.url}
                </a>
              </td>
              <td className="p-3 border text-center">
                <button
                  onClick={() => deleteBookmark(b.id)}
                  className="bg-red-500 text-white px-4 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}