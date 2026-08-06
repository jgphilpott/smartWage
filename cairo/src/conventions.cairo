//! Shared conventions for proof interfaces.

/// Returns the current stable proof-interface version identifier.
pub fn proof_interface_version() -> felt252 {
    crate::PROOF_INTERFACE_VERSION
}
