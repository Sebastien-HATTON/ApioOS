#!/bin/bash
path="public/applications"
re="^[0-9]+$"
date0=$(date "+%Y-%-m-%-d")
date1=$(date --date="1 days ago" "+%Y-%-m-%-d")
date2=$(date --date="2 days ago" "+%Y-%-m-%-d")
date3=$(date --date="3 days ago" "+%Y-%-m-%-d")
apps=$(ls $path)
for app in $apps
do
	if [[ -d $path/$app ]] && [[ $app =~ $re ]]; then
		objectsFiles=$(ls $path/$app | sed 's/\ /\\\ /g')
		analyticsFiles=$(ls $path/$app/analytics | sed 's/\ /\\\ /g')
		SAVEIFS=$IFS
		IFS=$(echo -en "\n\b")
		for file in $objectsFiles
		do
			f=$(echo $file | tr '\\' '\0')
			if [[ $file == *.json ]] && [[ $file != *$date0* ]] && [[ $file != *$date1* ]] && [[ $file != *$date2* ]] && [[ $file != *$date3* ]]; then
				rm -f $path/$app/$f
			fi
		done

		for file in $analyticsFiles
		do
			f=$(echo $file | tr '\\' '\0')
			if [[ $file == *.json ]] && [ ${#file} -ge 18 ] && [[ $file != *$date0* ]] && [[ $file != *$date1* ]] && [[ $file != *$date2* ]] && [[ $file != *$date3* ]]; then
				rm -f $path/$app/analytics/$f
			fi
		done
		IFS=$SAVEIFS
	fi
done
