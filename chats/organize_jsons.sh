#!/bin/bash

# Script that organizes .json files into their own folders.
#
# Give a specified directory, this script will iterate over every json file in 
# that dir. For each .json file, the script will create a new folder with the 
# same name as the file and moves that .json file into said folder.
#
# Usage:
# 	.organize_jsons.sh
# 	.roganize_jsons.sh path/to/dir/

# Check if an argument (directory path) was provided
if [ $# -eq 0 ]; then
    # If no argument is provided, use the current directory
    directory="."
else
    # Use the provided argument as the directory
    directory="$1"
fi

# Check if the provided directory exists
if [ ! -d "$directory" ]; then
    echo "Error: Directory $directory does not exist."
    exit 1
fi

# Loop through all .json files in the specified or current directory
for json_file in "$directory"/*.json; do
    # Check if the file exists (in case there are no .json files)
    [ -f "$json_file" ] || continue
    
    # Extract the filename without the path
    filename=$(basename "$json_file" .json)
    
    # Create a directory with the same name as the JSON file
    mkdir -p "$directory/$filename"
    
    # Move the JSON file into the new directory
    mv "$json_file" "$directory/$filename/"
done

echo "All .json files have been moved into their respective directories."
