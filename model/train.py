"""Train Ai's small language model from random weights."""
import argparse
import json
import math
from pathlib import Path

import torch

from network import AiTransformer, ByteTokenizer, load_config


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/train.txt", help="UTF-8 plain-text training corpus")
    parser.add_argument("--steps", type=int, default=5000)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--eval-every", type=int, default=250)
    parser.add_argument("--output", default="checkpoints/ai-small.pt")
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        raise SystemExit(f"Training text not found: {data_path}. Add a licensed, high-quality UTF-8 text corpus first.")
    raw = data_path.read_text(encoding="utf-8")
    encoded = torch.tensor(ByteTokenizer.encode(raw), dtype=torch.long)
    config = load_config()
    block = config["block_size"]
    if len(encoded) < block + 2:
        raise SystemExit(f"Corpus is too small. Need at least {block + 2} UTF-8 bytes; found {len(encoded)}.")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    split = int(len(encoded) * 0.9)
    train_data, val_data = encoded[:split], encoded[split:]
    if len(val_data) < block + 2:
        train_data, val_data = encoded, encoded

    def batch(source):
        starts = torch.randint(0, len(source) - block - 1, (args.batch_size,))
        x = torch.stack([source[i:i + block] for i in starts]).to(device)
        y = torch.stack([source[i + 1:i + block + 1] for i in starts]).to(device)
        return x, y

    model = AiTransformer(config).to(device)  # Random initialization: no pretrained weights.
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
    scaler = torch.amp.GradScaler("cuda", enabled=device == "cuda")
    print(f"Training from random initialization | device={device} | parameters={sum(p.numel() for p in model.parameters()):,}")
    print(f"Corpus bytes={len(encoded):,} | train={len(train_data):,} | validation={len(val_data):,}")

    for step in range(1, args.steps + 1):
        model.train()
        x, y = batch(train_data)
        optimizer.zero_grad(set_to_none=True)
        with torch.autocast(device_type="cuda", dtype=torch.float16, enabled=device == "cuda"):
            _, loss = model(x, y)
        scaler.scale(loss).backward()
        scaler.unscale_(optimizer)
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        scaler.step(optimizer)
        scaler.update()

        if step == 1 or step % args.eval_every == 0 or step == args.steps:
            model.eval()
            with torch.no_grad():
                vx, vy = batch(val_data)
                _, val_loss = model(vx, vy)
            print(f"step {step:>6} | train loss {loss.item():.4f} | val loss {val_loss.item():.4f}")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"config": config, "model": model.cpu().state_dict(), "steps": args.steps}, output)
    print(f"Saved checkpoint: {output}")


if __name__ == "__main__":
    main()
