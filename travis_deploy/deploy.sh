#!/bin/bash
set -ev
chmod 400 travis_deploy/deploy_key
/usr/bin/ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no vegosvar@dev.vegosvar.se -i travis_deploy/deploy_key 'cd /home/Vegosvar && echo test > travis.txt' 
