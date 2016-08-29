#!/bin/bash
arch=$(uname -m)
if [[ $arch == *"arm"* ]]; then
	wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-arm.zip
elif [[ $arch == *"86"* ]]; then
	wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
fi
unzip ngrok-*.zip
mkdir -p /opt/ngrok/bin/
mv ./ngrok /opt/ngrok/bin/ngrok
rm ngrok-*.zip
ln -sf /opt/ngrok/bin/ngrok /usr/bin/ngrok
lines_number=$(wc -l < /etc/rc.local)
#sed -i "$((lines_number-1)) a sudo -u pi ngrok tcp 22 -log=stdout &> /dev/null &" /etc/rc.local
sed -i "$((lines_number-1)) a sudo -u pi ngrok tcp 22 &" /etc/rc.local
sudo -u pi ngrok authtoken $1
echo "console_ui: false" >> /home/pi/.ngrok2/ngrok.yml
#sudo -u pi ngrok tcp 22 -log=stdout &> /dev/null &
sudo -u pi ngrok tcp 22 &
exit 0
