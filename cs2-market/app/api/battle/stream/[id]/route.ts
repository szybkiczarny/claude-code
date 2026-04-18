import { NextRequest } from "next/server";
import { battleStore } from "@/lib/battle-store";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const battle = battleStore.get(params.id);
  if (!battle) {
    return new Response("Battle not found", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // send current state immediately
      send(battle);

      // subscribe to updates
      const unsub = battleStore.subscribe(params.id, (updated) => {
        send(updated);
        if (updated.status === "done") {
          setTimeout(() => controller.close(), 1000);
        }
      });

      // cleanup on disconnect
      _req.signal.addEventListener("abort", () => {
        unsub();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
