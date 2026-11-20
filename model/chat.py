"""Run a trained Ai checkpoint locally."""
import argparse

import torch

from network import AiTransformer, ByteTokenizer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", default="checkpoints/ai-small.pt")
    parser.add_argument("--max-new-tokens", type=int, default=300)
    args = parser.parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    checkpoint = torch.load(args.checkpoint, map_location=device, weights_only=False)
    model = AiTransformer(checkpoint["config"]).to(device)
    model.load_state_dict(checkpoint["model"])
    model.eval()
    tokenizer = ByteTokenizer()
    print("Ai scratch model loaded. Type /exit to quit.")
    while True:
        prompt = input("\nYou: ").strip()
        if prompt == "/exit":
            break
        if not prompt:
            continue
        tokens = torch.tensor([tokenizer.encode(prompt)], dtype=torch.long, device=device)
        output = model.generate(tokens, max_new_tokens=args.max_new_tokens)
        print("Ai:", tokenizer.decode(output[0, tokens.shape[1]:].tolist()))


if __name__ == "__main__":
    main()
