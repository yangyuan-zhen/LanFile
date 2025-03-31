import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import TransferSimulator from "./TransferSimulator";
import { FaTools } from "react-icons/fa";

interface TransferSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 传输模拟器弹窗组件
export const TransferSimulatorModal: React.FC<TransferSimulatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>传输模拟器</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <TransferSimulator />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// 弹窗控制钩子，可以在应用中的任何位置使用
export const useTransferSimulator = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return {
    isOpen,
    openTransferSimulator: onOpen,
    closeTransferSimulator: onClose,
    SimulatorButton: () => (
      <div
        className="flex items-center py-2 px-3 rounded-md hover:bg-gray-100 text-gray-700 group cursor-pointer"
        onClick={onOpen}
      >
        <FaTools className="mr-2 text-gray-500 group-hover:text-blue-500" />
        <span>传输模拟器</span>
      </div>
    ),
  };
};

export default TransferSimulatorModal;
