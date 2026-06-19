import { createBrowserClient } from '@supabase/ssr'

const DEMO_ERROR = { message: "Mode démo : modifications désactivées." }

// Chaînable qui absorbe n'importe quelle suite d'appels (.select().single(),
// .eq(), etc.) et se résout toujours sur la même erreur — quel que soit le
// pattern de chaînage utilisé après insert/update/upsert/delete ailleurs
// dans le code.
function deniedChain(): any {
  const resolved = Promise.resolve({ data: null, error: DEMO_ERROR })
  return new Proxy(resolved, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop].bind(target)
      return () => deniedChain()
    },
  })
}

function wrapReadOnly(client: ReturnType<typeof createBrowserClient>): void {
  const originalFrom = client.from.bind(client)
  ;(client as any).from = (table: string) => {
    const builder: any = originalFrom(table as any)
    for (const method of ["insert", "update", "upsert", "delete"]) {
      builder[method] = () => deniedChain()
    }
    return builder
  }

  const originalStorageFrom = client.storage.from.bind(client.storage)
  ;(client.storage as any).from = (bucket: string) => {
    const storageBuilder: any = originalStorageFrom(bucket)
    for (const method of ["upload", "update", "remove"]) {
      storageBuilder[method] = async () => ({ data: null, error: DEMO_ERROR })
    }
    return storageBuilder
  }
}

// Salon démo public (voir page d'accueil agenda-plus.fr, badges "Site"/"Agenda") :
// accessible sans connexion, donc toute écriture doit être neutralisée ici,
// au point d'entrée unique du client Supabase navigateur.
function isDemoHost() {
  return typeof window !== "undefined" && window.location.hostname === "demo.agenda-plus.fr"
}

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
  if (isDemoHost()) wrapReadOnly(client)
  return client
}
