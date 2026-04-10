# Eval Report

Generated: 2026-04-10T07:45:14.158Z

## Q01
- Prompt: What percentage of healthcare organisations had implemented domain-specific AI tools as of 2025, and how does this compare to the broader enterprise market?
- Total: 5/11
- Route: multi_hop
- Citation articles: 1
- Trap check: pass — No deterministic trap check configured.
- Critic: Critic review degraded, so the answer is shown with a conservative verification note. Critic error: fetch failed

## Q02
- Prompt: In a Fall 2024 survey of 43 US non-profit health systems, which AI use case was the only one with 100% adoption activity, and what success rate did respondents report for it?
- Total: 6/11
- Route: simple_factual
- Citation articles: 
- Trap check: pass — No deterministic trap check configured.
- Critic: Critic review degraded, so the answer is shown with a conservative verification note. Critic error: [
  {
    "code": "invalid_union",
    "errors": [
      [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received null"
        }
      ],
      [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected string, received null"
        }
      ]
    ],
    "path": [
      "checks",
      0
    ],
    "message": "Invalid input"
  },
  {
    "code": "invalid_union",
    "errors": [
      [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received null"
        }
      ],
      [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected string, received null"
        }
      ]
    ],
    "path": [
      "checks",
      1
    ],
    "message": "Invalid input"
  }
]

## Q03
- Prompt: What share of clinical questions did the agentic system ChatRWD answer usefully, compared to standard large language models such as ChatGPT and Gemini?
- Total: 3/11
- Route: simple_factual
- Citation articles: 
- Trap check: fail — Reject answers that misclassify ChatRWD as plain RAG.
- Critic: The draft correctly identifies that the provided evidence lacks information about ChatRWD.

## Q04
- Prompt: How many FDA-cleared AI/ML-enabled medical devices existed in the United States by mid-2024, and which clinical specialty accounts for the largest share of those approvals?
- Total: 3/11
- Route: simple_factual
- Citation articles: 
- Trap check: fail — Reject answers that conflate total devices with the radiology subset.
- Critic: Critic review degraded, so the answer is shown with a conservative verification note. Critic error: fetch failed

## Q05
- Prompt: What Phase II milestone did Insilico Medicine reach with its AI-designed drug ISM001-055 (Rentosertib), what disease does it target, and what company merger in the same period reshaped the AI drug discovery competitive landscape?
- Total: 6/11
- Route: multi_hop
- Citation articles: 11, 13, 2
- Trap check: pass — No deterministic trap check configured.
- Critic: The drafted answer accurately reflects the provided evidence, correctly noting the absence of specific details about ISM001-055 and mergers while accurately citing the mentioned partnerships and Insilico Medicine's status.

## Q06
- Prompt: A 2025 PLOS Digital Health paper identifies five critical ethical concerns in clinical AI integration. What are they, and which concern does the paper call out as most likely to worsen existing healthcare inequities?
- Total: 4/11
- Route: simple_factual
- Citation articles: 
- Trap check: pass — No deterministic trap check configured.
- Critic: Critic review degraded, so the answer is shown with a conservative verification note. Critic error: [
  {
    "code": "invalid_union",
    "errors": [
      [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received null"
        }
      ],
      [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected string, received null"
        }
      ]
    ],
    "path": [
      "checks",
      0
    ],
    "message": "Invalid input"
  },
  {
    "code": "invalid_union",
    "errors": [
      [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received null"
        }
      ],
      [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected string, received null"
        }
      ]
    ],
    "path": [
      "checks",
      1
    ],
    "message": "Invalid input"
  },
  {
    "code": "invalid_union",
    "errors": [
      [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received null"
        }
      ],
      [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected string, received null"
        }
      ]
    ],
    "path": [
      "checks",
      2
    ],
    "message": "Invalid input"
  }
]

## Q07
- Prompt: The Hastings Center identifies a specific behavioural tendency of large language models that makes them unsuitable as standalone therapists. What is it, and why does it pose a particular risk in mental health contexts?
- Total: 7/11
- Route: simple_factual
- Citation articles: 19
- Trap check: pass — No deterministic trap check configured.
- Critic: All claims in the drafted answer are fully supported by the provided text from the Hastings Center Bioethics Briefing Book.

## Q08
- Prompt: A 2024 cross-sectional study of FDA-cleared AI devices found a critical gap in demographic reporting. What specific data was missing from the vast majority of device submissions, and what percentage of devices reported it?
- Total: 5/11
- Route: simple_factual
- Citation articles: 15
- Trap check: pass — No deterministic trap check configured.
- Critic: Critic review degraded, so the answer is shown with a conservative verification note. Critic error: fetch failed

## Q09
- Prompt: Imaging AI has high deployment rates across US health systems but only 19% of deployers report high success. Using what you know about FDA validation gaps and algorithmic bias literature, construct the most likely causal mechanism for this divergence.
- Total: 3/11
- Route: multi_hop
- Citation articles: 3
- Trap check: fail — Require the deployment-success and demographic-reporting linkage.
- Critic: Critic review degraded, so the answer is shown with a conservative verification note. Critic error: [
  {
    "code": "invalid_union",
    "errors": [
      [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received null"
        }
      ],
      [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected string, received null"
        }
      ]
    ],
    "path": [
      "checks",
      0
    ],
    "message": "Invalid input"
  },
  {
    "code": "invalid_union",
    "errors": [
      [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received null"
        }
      ],
      [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected string, received null"
        }
      ]
    ],
    "path": [
      "checks",
      1
    ],
    "message": "Invalid input"
  },
  {
    "code": "invalid_union",
    "errors": [
      [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received null"
        }
      ],
      [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected string, received null"
        }
      ]
    ],
    "path": [
      "checks",
      2
    ],
    "message": "Invalid input"
  },
  {
    "code": "invalid_union",
    "errors": [
      [
        {
          "expected": "object",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected object, received null"
        }
      ],
      [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [],
          "message": "Invalid input: expected string, received null"
        }
      ]
    ],
    "path": [
      "checks",
      3
    ],
    "message": "Invalid input"
  }
]

## Q10
- Prompt: Two frameworks for governing post-deployment AI in healthcare propose different monitoring mechanisms. One focuses on operationalised clinic-level audit steps; the other calls for adaptive regulatory oversight replacing static approval. What does the EU AI Act add that neither framework alone provides?
- Total: 4/11
- Route: multi_hop
- Citation articles: 2
- Trap check: pass — No deterministic trap check configured.
- Critic: The drafted answer accurately reflects the provided evidence, correctly noting the absence of information on the EU AI Act and clinic-level audit steps, while accurately citing the IMDRF's role.

## Q11
- Prompt: On March 18 2026, mental health care providers at Kaiser Permanente went on strike. How many workers participated, what specific triage headcount change at one facility triggered the action, and what UK AI company was KP confirmed to be evaluating?
- Total: 3/11
- Route: simple_factual
- Citation articles: 
- Trap check: fail — Require the live Article 21 facts or an explicit epistemic refusal.
- Critic: Critic review degraded, so the answer is shown with a conservative verification note. Critic error: fetch failed
