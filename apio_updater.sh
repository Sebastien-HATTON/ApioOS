#!/bin/bash
git pull https://$1:$2@github.com/ApioLab/Apio-VIP-2.3-DEV.git
npm install
bower install
