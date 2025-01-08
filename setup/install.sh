#!/bin/bash

echo "Installing required Python packages..."
pip3 install --upgrade pip  # Ensure pip is up to date
pip3 install langchain langchain-community python-dotenv requests
pip3 install openai
pip3 install tqdm

echo "Installing ollama..."
curl -fsSL https://ollama.com/install.sh | sh
pip3 install ollama

echo "Installation complete!"

