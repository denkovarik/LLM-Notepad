#!/bin/bash

echo "Installing required Python packages..."
pip3 install --upgrade pip  # Ensure pip is up to date
pip3 install langchain langchain-community python-dotenv requests
pip3 install openai
pip3 install tqdm
pip3 install uvicorn
pip3 install fastapi
pip3 install yaspin
# For CUDA 12.1
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip3 install transformers
pip3 install nest_asyncio

echo "Install LightRAG"
# https://pypi.org/project/lightrag-hku/
pip install "lightrag-hku[api]"

git clone https://github.com/HKUDS/LightRAG.git
cd LightRAG
# create a Python virtual enviroment if neccesary
# Install in editable mode with API support
pip install -e ".[api]"


echo "Installing ollama..."
curl -fsSL https://ollama.com/install.sh | sh
pip3 install ollama

echo "Installation complete!"

