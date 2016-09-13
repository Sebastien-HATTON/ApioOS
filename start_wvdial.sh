#!/bin/bash
if [[ ! -z $(lsusb | grep '2001:7d02') ]]; then
	_per=$(dmesg | grep 'GSM modem' | grep 'option' | tail -4 | head -1 | awk '{print $4}' | cut -d ':' -f1)
	wvdial & > /dev/null
	sleep 0.2
	pkill wvdial
	if [[ ! -z $_per ]]; then
		echo $_per | tee /sys/bus/usb/drivers/usb/unbind
		sleep 0.2
		echo $_per | tee /sys/bus/usb/drivers/usb/bind
		_old_per=$(cat /etc/wvdial.conf | grep 'Modem =' | awk '{print $NF}')
		_new_per=/dev/$(dmesg | grep 'GSM modem' | grep 'usb' | grep 'tty' | tail -4 | head -1 | awk '{print $NF}')
		sed -i -e "s|$_old_per|$_new_per|" /etc/wvdial.conf
	fi
	sleep 0.2
	wvdial & > /dev/null
fi
exit 0
