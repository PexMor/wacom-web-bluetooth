#!/bin/bash
#
# this is a tool script that makes static webmanifest
#

# files to transform (make unique)
FNS=(ble.js index.html desc.html sw.js)

# make sure that static names reflect the content
echo "-=[ Filename to hash sed"
for FN in "${FNS[@]}"; do
    HASH=`openssl sha1 $FN | tr -d "\t " | cut -d= -f2`
    SFN=${FN%.*}
    EXT=${FN#*.}
    echo "s#${FN}#${SFN}_${HASH}.${EXT}#"
done | tee fn_hash.sed

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

FN="site.webmanifest"
cat "$FN" | sed -f fn_hash.sed > "docs/$FN"

FN=index.html
NFN=`echo "$FN" | sed -f fn_hash.sed`
ln -sf $NFN docs/$FN
