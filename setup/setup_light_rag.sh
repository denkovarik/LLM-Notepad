#!/bin/bash

original_dir=$(pwd)

echo "Current working directory: $(pwd)";

cd "$HOME";

echo "Current working directory: $(pwd)";

git clone https://github.com/HKUDS/LightRAG.git

cd LightRAG

pip install -e .

cd "$original_dir";

echo "Current working directory: $(pwd)";

pip install nest_asyncio
