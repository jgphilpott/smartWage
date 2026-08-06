//! Shared conventions for proof interfaces.

/// Stable interface identifier for the reusable package.
pub const INTERFACE_VERSION: felt252 = 'v1';

/// Domain namespace markers reserved for long-term extensibility.
pub const NAMESPACE_INCOME: felt252 = 'income';
pub const NAMESPACE_EMPLOYMENT: felt252 = 'employment';
pub const NAMESPACE_IDENTITY: felt252 = 'identity';
pub const NAMESPACE_ELIGIBILITY: felt252 = 'eligibility';

/// Returns the current stable proof-interface version identifier.
pub fn proof_interface_version() -> felt252 {
    INTERFACE_VERSION
}
