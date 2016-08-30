ApioOS
==========

This repository contains ApioOS the first WebOS that link together everything in internet: Things, Services, Cloud Platform and People.

# Changes:
* Improved Serial algorithm
* Cloud Sync
* User
* Configuration File

# Features:
* Runnable on PC, [Raspberry](https://www.raspberrypi.org), [Acqua](http://www.acmesystems.it/acqua), [Beaglebone Black](http://beagleboard.org/BLACK) and others embedded linux board
* Cloud Sync
* User Management
* Google Maps Full Integration 
* Connect your Wifi/Ethernet Objects
* Create your Mesh Network with Apio Dongle and Apio General
* SDK for create Objects without coding
* If and then Logics
* View it through smartphone/tablet and PC


# Build and Run

### Prerequisites
To install and run the Apio Server application you will need:
* Nodejs
* NPM
* MongoDB

You need to update the Apio Dongle with this firmware:
https://github.com/ApioLab/library-arduino

===========
### Install

* `cd /path/to/your/directory`
* `git clone https://github.com/ApioLab/Apio-VIP.git`
* `cd Apio-VIP`
* `npm install && bower install`

The apio server application is now installed and configured

### Run
From the server folder run:

* `mongod start &`
* `node app`

### Use it:
Open your browser and digit this URL:

* From Pc `localhost:8083/app`
* Frmo smartphone `yourip:8083/app`

If you want more information please visit: [Apio](http://www.apio.cc)
