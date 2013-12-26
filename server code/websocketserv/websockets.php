<?php
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\App;
    // Make sure composer dependencies have been installed
    require __DIR__ . '/vendor/autoload.php';

class WhiteboardrServ implements MessageComponentInterface {
    protected $clients;
    protected $channel;

    public function __construct($channel) {
        $this->clients = new \SplObjectStorage;
        $this->channel = $channel;
    }

    public function onOpen(ConnectionInterface $conn) {
        print($conn->channel);
        $this->clients->attach($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        print("message on channel ".$this->channel);
        foreach ($this->clients as $client) {
            if ($from != $client) {
                $client->send($msg);
            }
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $conn->close();
    }
}

class WhiteboardrServProxy implements MessageComponentInterface {
    protected $handlers;

    public function __construct() {
        $this->handlers = array();
    }

    public function onOpen(ConnectionInterface $conn) {
        $channel = $conn->channel;
        if (isset($this->handlers[$channel])) {
            $handler = $this->handlers[$channel];
            $handler->onOpen($conn);
        } else {
            $handler = new WhiteboardrServ($channel);
            $this->handlers[$channel] = $handler;
            $handler->onOpen($conn);
        }
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $channel = $from->channel;
        if (isset($this->handlers[$channel])) {
            $handler = $this->handlers[$channel];
            $handler->onMessage($from, $msg);
        } else {
            throw new Exception("No handler found for channel ".$channel);
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $channel = $conn->channel;
        if (isset($this->handlers[$channel])) {
            $handler = $this->handlers[$channel];
            $handler->onClose($conn);
        } else {
            throw new Exception("No handler found for channel ".$channel);
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $channel = $conn->channel;
        if (isset($this->handlers[$channel])) {
            $handler = $this->handlers[$channel];
            $handler->onError($conn, $e);
        } else {
            throw new Exception("No handler found for channel ".$channel);
        }
    }
}

    $app = new App('54.200.154.131', 80, '0.0.0.0'); //EC2 instance
    $app->route('/{channel}', new WhiteboardrServProxy, array('*'));
    $app->run();
