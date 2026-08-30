import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteField, collection, getDocs, getDoc, onSnapshot, query, where } from 'firebase/firestore';