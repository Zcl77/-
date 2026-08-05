$env:Path = "F:\nodejs;" + ($env:Path -replace "F:\\node-nvm\\nodejs;?", "")
npm install
npm run dev
