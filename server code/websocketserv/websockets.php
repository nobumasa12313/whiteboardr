<?php
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\App;
    // Make sure composer dependencies have been installed
    require __DIR__ . '/vendor/autoload.php';

class WhiteboardrServ implements MessageComponentInterface {
    protected $clients;
    protected $channel;
    protected $currentid;
    protected $sessids;

    public function __construct($channel) {
        $this->clients = new \SplObjectStorage;
        $this->channel = $channel;
        $this->currentid = 0;
        $this->sessids = array();
        print("channel " .$this->channel ." created");
    }

    public function onOpen(ConnectionInterface $conn) {
        $newid = $this->generateID();
        $conn->id = $newid;
        $this->clients->attach($conn, $newid);
        $response = array("opcode" => "connect", "rescode" => "success");
        $conn->send(json_encode($response));
    }

    public function onMessage(ConnectionInterface $from, $data) {
        print("message on channel ".$this->channel." :".$data);
        $data = json_decode($data);
        switch ($data->{'opcode'}) {
            case "sessiondata":
                $sessid = $data->{'sessid'};
                $nickname = $data->{'nickname'};
                //validate . . .
                if (true) {
                    $packet = array("opcode" => "join", "rescode" => "success", "id" => $from->id);
                    $this->sessids[$from->id] = $sessid;
                    $from->send(json_encode($packet));
                    $this->updateOccupancy();
                } else {
                    $from->close();
                    $this->clients->detach($from);
                }
            break;
        }
    }

    public function generateID() {
        $this->currentid++;
        return $this->currentid;
    }

    public function updateOccupancy() {
        $packet = array("opcode" => "roomupdate", "numOccupants" => count($this->clients));
        foreach ($this->clients as $client) {
            $client->send(json_encode($packet));
        }
    }

    public function onClose(ConnectionInterface $conn) {
        if (isset($this->sessids[$conn->id])) {
            unlink($this->sessids[$conn->id]);
        }
        $this->clients->detach($conn);
        $this->updateOccupancy();
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
