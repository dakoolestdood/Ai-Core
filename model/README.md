# Ai's from-scratch model

This directory contains an independent decoder-only Transformer implementation. It starts from randomly initialized weights; it does not load Qwen or another pretrained checkpoint.

## Current status

- Architecture: small causal Transformer, implemented in `network.py`.
- Tokenizer: UTF-8 byte tokenizer (256 tokens).
- Training: `train.py` trains from a UTF-8 text corpus.
- Inference: `chat.py` loads a locally trained PyTorch checkpoint.
- Checkpoint: not yet included. No trained model weights are currently shipped.
- Website integration: not yet complete. The website still uses its existing WebLLM model until a tested browser-compatible checkpoint and inference runtime are available.

## Train

Use a machine with Python and PyTorch installed. Add a legally usable corpus at `data/train.txt`, then run:

```bash
python model/train.py --data data/train.txt --steps 5000 --output checkpoints/ai-small.pt
python model/chat.py --checkpoint checkpoints/ai-small.pt
```

A small corpus or a few thousand steps will produce a learning experiment, not a capable general-purpose assistant. Use text you created, public-domain text, or material whose license permits this use. Keep private information out of training data.

## Next engineering milestone

Export and validate the trained checkpoint for browser inference (for example, ONNX Runtime Web or a dedicated WebGPU runtime), then replace the current WebLLM/Qwen loader only after the independent model produces valid outputs in the deployed site. Do not label the website as running the scratch model before this test passes.
