import { END, START, StateGraph } from "@langchain/langgraph";

import { criticNode } from "@/lib/langgraph/nodes/critic";
import { decomposerNode } from "@/lib/langgraph/nodes/decomposer";
import { evidenceAssemblerNode } from "@/lib/langgraph/nodes/evidence-assembler";
import { formatterNode } from "@/lib/langgraph/nodes/formatter";
import { retrieverNode } from "@/lib/langgraph/nodes/retriever";
import { routerNode } from "@/lib/langgraph/nodes/router";
import { synthesizerNode } from "@/lib/langgraph/nodes/synthesizer";
import { graphStateSchema } from "@/lib/langgraph/state";

export const healthcareGraph: any = new StateGraph(graphStateSchema as never)
  .addNode("router", routerNode as never)
  .addNode("decomposer", decomposerNode as never)
  .addNode("retriever", retrieverNode as never)
  .addNode("evidenceAssembler", evidenceAssemblerNode as never)
  .addNode("synthesizer", synthesizerNode as never)
  .addNode("critic", criticNode as never)
  .addNode("formatter", formatterNode as never)
  .addEdge(START, "router")
  .addConditionalEdges(
    "router",
    ((state: { routeTaken?: string }) =>
      state.routeTaken === "simple_factual" ? "retriever" : "decomposer") as never
  )
  .addEdge("decomposer", "retriever")
  .addEdge("retriever", "evidenceAssembler")
  .addEdge("evidenceAssembler", "synthesizer")
  .addEdge("synthesizer", "critic")
  .addEdge("critic", "formatter")
  .addEdge("formatter", END)
  .compile();
