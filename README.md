# Discord Builds Dissector

This project aims to be a correct and efficient dissector for various types of
Discord builds.

Currently there are dissectors present for the web builds only but soon I'll be
adding dissectors for Developer Portal builds.

You can view the different files in the [`./dissector`](./dissector) folder to
see how things work, I've done extensive research on the web client and have
documented them in the individual files, these documentations include a YAML
representation of the AST and major changes from 2016 to current time.\
*(why document and implement support for old builds? why not.)*

I have noted down some things in my [`notes`](./notes.md) you can read them if you want to.\
There are some files I downloaded for testing under [`./files`](./files), dont ask
why they are all suffixed `.txt`, I don't want vscode to OOM.

As there's no way to view older developer portal builds and there also isn't a
project archiving them I'll be only documenting recent things for them unlike the
web dissector.

A lot of this work has been adopted from my contribution to [havoc](https://github.com/slice/havoc)
and [snitch](https://github.com/slice/snitch) both awesome projects.\
Although unlike the above projects this project doesn't provide any way to poll
builds and provide updates, nor is it written in Rust or Haskell :p
