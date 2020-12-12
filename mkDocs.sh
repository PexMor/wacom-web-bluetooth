#!/bin/bash
#
# this is a tool script that makes static webmanifest
#

function mkOffline() {
SPC="        "
find docs -type f | grep -v webmanifest | grep -v "sw.*\.js" | cut -c6- | while read LINE; do
    echo -n "${SPC}'$LINE',\\n"
done > /tmp/list

VAL=`cat /tmp/list`
#VAL=${VAL:0:${#VAL}-3}
VAL="${VAL}${SPC}'.'"

echo "$VAL"
sed "s#@REPLACE@#$VAL#g" <sw.js.frag >docs/sw.js
}

# files to transform (make unique)
FNS=(ble.js index.html desc.html)

# make sure that static names reflect the content
echo "-=[ Filename to hash sed"
for FN in "${FNS[@]}"; do
    HASH=`openssl sha1 $FN | tr -d "\t " | cut -d= -f2`
    SFN=${FN%.*}
    EXT=${FN#*.}
    echo "s#${FN}#${SFN}_${HASH}.${EXT}#"
done | tee fn_hash.sed

rm docs/sw.js

# fix references inside scripts
echo "-=[ process references"
for FN in "${FNS[@]}"; do
    NFN=`echo "$FN" | sed -f fn_hash.sed`
    SFN=${FN%.*}
    EXT=${FN#*.}
    rm docs/${SFN}_*.$EXT
    echo "src:$FN dst:$NFN"
    cat "$FN" | sed -f fn_hash.sed > "docs/$NFN"
    echo "diff old vs sed processed"
    diff -u "$FN" "docs/$NFN"
    RC=$?
    echo "-=[ RC: $RC"
done

mkOffline

FN=sw.js
HASH=`openssl sha1 docs/$FN | tr -d "\t " | cut -d= -f2`
SFN=${FN%.*}
EXT=${FN#*.}
echo "s#${FN}#${SFN}_${HASH}.${EXT}#" >>fn_hash.sed
rm docs/sw_*.js
mv docs/sw.js "docs/${SFN}_${HASH}.${EXT}"

FN="site.webmanifest"
cat "$FN" | sed -f fn_hash.sed > "docs/$FN"

FN=index.html
NFN=`echo "$FN" | sed -f fn_hash.sed`
ln -sf $NFN docs/$FN
