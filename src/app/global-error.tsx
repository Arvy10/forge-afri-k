"use client";

/** Dernier filet de sécurité (erreur dans le layout racine). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui",
          padding: "3rem 1.5rem",
          textAlign: "center",
          background: "#f6f1e4",
          color: "#1b3409",
        }}
      >
        <h1>Quelque chose n&apos;a pas fonctionné</h1>
        <p>Recharge la page. Si le problème continue, préviens l&apos;ambassadeur du pôle.</p>
        <button
          onClick={reset}
          style={{
            minHeight: 44,
            padding: "0 1.25rem",
            borderRadius: 8,
            border: 0,
            background: "#a63e04",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
