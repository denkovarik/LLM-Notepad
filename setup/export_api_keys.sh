#!/bin/bash

# Export the API keys
config_file="config/config.ini"

# Read the API keys from the config file
openai_api_key=$(awk -F '=' '/^OPENAI_API_KEY/ {print $2}' "$config_file" | tr -d ' ');
grok_api_key=$(awk -F '=' '/^XAI_API_KEY/ {print $2}' "$config_file" | tr -d ' ');

# Export the keys
export OPENAI_API_KEY="$openai_api_key"
export XAI_API_KEY="$grok_api_key"
