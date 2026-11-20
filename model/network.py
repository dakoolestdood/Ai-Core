"""Small decoder-only Transformer language model trained from random initialization."""
import json
from pathlib import Path

import torch
from torch import nn


class ByteTokenizer:
    """A simple UTF-8 byte tokenizer: every possible byte is one token."""
    vocab_size = 256

    @staticmethod
    def encode(text: str) -> list[int]:
        return list(text.encode("utf-8"))

    @staticmethod
    def decode(tokens: list[int]) -> str:
        return bytes(max(0, min(255, int(token))) for token in tokens).decode("utf-8", errors="replace")


class AiTransformer(nn.Module):
    def __init__(self, config: dict):
        super().__init__()
        self.config = config
        width = config["n_embd"]
        self.token_embedding = nn.Embedding(config["vocab_size"], width)
        self.position_embedding = nn.Embedding(config["block_size"], width)
        layer = nn.TransformerEncoderLayer(
            d_model=width,
            nhead=config["n_head"],
            dim_feedforward=4 * width,
            dropout=config["dropout"],
            batch_first=True,
            norm_first=True,
            activation="gelu",
        )
        self.blocks = nn.TransformerEncoder(layer, num_layers=config["n_layer"])
        self.final_norm = nn.LayerNorm(width)
        self.output = nn.Linear(width, config["vocab_size"], bias=False)
        self.output.weight = self.token_embedding.weight
        self.block_size = config["block_size"]

    def forward(self, tokens, targets=None):
        batch, length = tokens.shape
        if length > self.block_size:
            raise ValueError(f"Input length {length} exceeds block size {self.block_size}")
        positions = torch.arange(length, device=tokens.device)
        x = self.token_embedding(tokens) + self.position_embedding(positions)[None, :, :]
        # True entries are masked by PyTorch's TransformerEncoder.
        causal_mask = torch.triu(torch.ones(length, length, device=tokens.device, dtype=torch.bool), diagonal=1)
        x = self.blocks(x, mask=causal_mask)
        logits = self.output(self.final_norm(x))
        loss = None
        if targets is not None:
            loss = nn.functional.cross_entropy(logits.reshape(-1, logits.size(-1)), targets.reshape(-1))
        return logits, loss

    @torch.no_grad()
    def generate(self, tokens, max_new_tokens=200, temperature=0.8):
        self.eval()
        for _ in range(max_new_tokens):
            context = tokens[:, -self.block_size:]
            logits, _ = self(context)
            logits = logits[:, -1, :] / max(temperature, 1e-4)
            probabilities = torch.softmax(logits, dim=-1)
            next_token = torch.multinomial(probabilities, num_samples=1)
            tokens = torch.cat((tokens, next_token), dim=1)
        return tokens


def load_config(path="model/config.json"):
    return json.loads(Path(path).read_text(encoding="utf-8"))
