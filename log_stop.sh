#!/bin/bash
sudo pkill node
cd ~/Apio-VIP-2.3-DEV
sudo forever start -s app.js
