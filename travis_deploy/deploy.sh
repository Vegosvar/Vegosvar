#!/bin/bash
set -ev
chmod 400 travis_deploy/deploy_key
ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no vegosvar@dev.vegosvar.se -i travis_deploy/deploy_key 'cd /opt/vegosvar && git pull && npm install && gulp prod && sudo service vegosvar restart'