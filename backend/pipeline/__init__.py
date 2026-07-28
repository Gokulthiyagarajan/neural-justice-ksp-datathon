"""Neural Justice — Multi-LLM Evidence Intelligence Pipeline.

4-stage pipeline for generating grounded investigation reports:
  Stage 1: Generation (GPT-OSS-120B)
  Stage 2: Critical Review (Nemotron Ultra)
  Stage 3: Deep Reasoning (DeepSeek R1)
  Stage 4: Consistency Pass (Nemotron Mini)

Each stage is verified by the shared evidence_verifier module.
"""
