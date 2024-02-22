#!/bin/bash

# Check if the version argument is provided
if [ -z "$1" ]; then
  echo "Error: Please provide a version number as an argument."
  exit 1
fi

# Assign the version number from the argument
version=$1

# Update the package.json version
jq --arg new_version "$version" '.version = $new_version' package.json > package.json.tmp && mv package.json.tmp package.json

# Display the updated version
echo "Updated package.json version to $version"
