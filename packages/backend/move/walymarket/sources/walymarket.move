module walymarket::walymarket {
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::String;
    use sui::event;
    
    // Error codes
    const EMarketResolved: u64 = 0;
    const EMarketNotResolved: u64 = 2;
    const EWrongOutcome: u64 = 3;
    const EInvalidMarket: u64 = 4;
    const ENotAdmin: u64 = 5;
    const EZeroWinningPool: u64 = 6;

    // Hardcoded admin address - use @0x prefix for address literals
    const ADMIN: address = @0xf6c4debedcb22dde758448e4d37dfd1bad64e8e152d1c34571cf80dd1e15dae5;
    
    // Admin capability
    public struct AdminCap has key, store { 
        id: UID 
    }
    
    // Market struct - holds the betting pools
    public struct Market has key {
        id: UID,
        question: String,
        yes_pool: Balance<SUI>,
        no_pool: Balance<SUI>,
        resolved: bool,
        resolution: bool,
        // Snapshot values captured at resolution time
        total_at_resolution: u64,
        winning_pool_at_resolution: u64,
    }
    
    // Share ticket for claiming winnings
    public struct ShareTicket has key, store {
        id: UID,
        market_id: ID,
        outcome: bool,
        amount_paid: u64,
    }
    
    // Events
    public struct MarketCreated has copy, drop { 
        market_id: ID, 
        question: String 
    }
    
    public struct SharesBought has copy, drop { 
        market_id: ID, 
        buyer: address, 
        outcome: bool, 
        amount: u64 
    }
    
    public struct MarketResolved has copy, drop { 
        market_id: ID, 
        winner: bool 
    }
    
    public struct WinningsClaimed has copy, drop {
        market_id: ID,
        claimer: address,
        payout: u64
    }
    
    // Initialize module - creates admin capability
    fun init(ctx: &mut TxContext) {
        transfer::public_transfer(
            AdminCap { id: object::new(ctx) }, 
            ctx.sender()
        );
    }
    
    // Create a new prediction market (admin gated by sender address)
    entry fun create_market(
        question: String, 
        ctx: &mut TxContext
    ) {
        assert!(ctx.sender() == ADMIN, ENotAdmin);
        let market = Market {
            id: object::new(ctx),
            question,
            yes_pool: balance::zero<SUI>(),
            no_pool: balance::zero<SUI>(),
            resolved: false,
            resolution: false,
            total_at_resolution: 0,
            winning_pool_at_resolution: 0,
        };
        
        event::emit(MarketCreated { 
            market_id: object::uid_to_inner(&market.id), 
            question: market.question 
        });
        
        transfer::share_object(market);
    }
    
    // Buy shares in a market outcome
    // Returns a ShareTicket for composability
    public fun buy_shares(
        market: &mut Market, 
        payment: Coin<SUI>, 
        outcome: bool, 
        ctx: &mut TxContext
    ): ShareTicket {
        assert!(!market.resolved, EMarketResolved);
        
        let amount = payment.value();
        let payment_balance = payment.into_balance();
        
        // Add to appropriate pool
        if (outcome) { 
            market.yes_pool.join(payment_balance);
        } else { 
            market.no_pool.join(payment_balance);
        };
        
        // Create share ticket
        let ticket = ShareTicket {
            id: object::new(ctx),
            market_id: object::uid_to_inner(&market.id),
            outcome,
            amount_paid: amount,
        };
        
        event::emit(SharesBought {
            market_id: object::uid_to_inner(&market.id),
            buyer: ctx.sender(),
            outcome,
            amount,
        });
        
        ticket
    }
    
    // Entry function wrapper for buy_shares that transfers to sender
    entry fun buy_shares_and_transfer(
        market: &mut Market, 
        payment: Coin<SUI>, 
        outcome: bool, 
        ctx: &mut TxContext
    ) {
        let ticket = buy_shares(market, payment, outcome, ctx);
        transfer::public_transfer(ticket, ctx.sender());
    }
    
    // Resolve market with winning outcome
    entry fun resolve_market(
        market: &mut Market, 
        winning_outcome: bool, 
        ctx: &mut TxContext
    ) {
        assert!(ctx.sender() == ADMIN, ENotAdmin);
        assert!(!market.resolved, EMarketResolved);
        
        // Snapshot pools before modifying them so payouts use pre-merge proportions
        let yes_val = market.yes_pool.value();
        let no_val = market.no_pool.value();
        let total = yes_val + no_val;
        let winning_val = if (winning_outcome) { yes_val } else { no_val };

        market.total_at_resolution = total;
        market.winning_pool_at_resolution = winning_val;
        market.resolved = true;
        market.resolution = winning_outcome;

        // Merge losing pool into winning pool so claims can be paid from a single pot
        if (winning_outcome) {
            if (no_val > 0) {
                let drained = market.no_pool.split(no_val);
                market.yes_pool.join(drained);
            };
        } else {
            if (yes_val > 0) {
                let drained = market.yes_pool.split(yes_val);
                market.no_pool.join(drained);
            };
        };
        
        event::emit(MarketResolved {
            market_id: object::uid_to_inner(&market.id),
            winner: winning_outcome,
        });
    }
    
    // Claim winnings with share ticket
    // Returns the winnings coin for composability
    public fun claim_winnings(
        market: &mut Market, 
        ticket: ShareTicket, 
        ctx: &mut TxContext
    ): Coin<SUI> {
        assert!(market.resolved, EMarketNotResolved);
        assert!(ticket.market_id == object::uid_to_inner(&market.id), EInvalidMarket);
        assert!(ticket.outcome == market.resolution, EWrongOutcome);
        
        // Use snapshot values captured at resolution
        let total_pool = market.total_at_resolution;
        let winning_pool = market.winning_pool_at_resolution;
        
        // Ensure winning pool is non-zero to avoid division by zero
        assert!(winning_pool > 0, EZeroWinningPool);
        
        // Calculate payout proportional to share of winning pool
        let payout = ((ticket.amount_paid as u128) * (total_pool as u128) / (winning_pool as u128)) as u64;
        
        // Withdraw from the appropriate pool
        let winnings_balance = if (market.resolution) {
            // After merge, yes_pool holds the entire pot when YES wins
            market.yes_pool.split(payout)
        } else {
            // After merge, no_pool holds the entire pot when NO wins
            market.no_pool.split(payout)
        };
        
        let winnings_coin = winnings_balance.into_coin(ctx);
        
        event::emit(WinningsClaimed {
            market_id: ticket.market_id,
            claimer: ctx.sender(),
            payout
        });
        
        // Destroy ticket
        let ShareTicket { id, market_id: _, outcome: _, amount_paid: _ } = ticket;
        object::delete(id);
        
        winnings_coin
    }
    
    // Entry function wrapper for claim_winnings that transfers to sender
    entry fun claim_winnings_and_transfer(
        market: &mut Market, 
        ticket: ShareTicket, 
        ctx: &mut TxContext
    ) {
        let winnings = claim_winnings(market, ticket, ctx);
        transfer::public_transfer(winnings, ctx.sender());
    }
    
    // View functions
    public fun get_yes_pool(market: &Market): u64 {
        market.yes_pool.value()
    }
    
    public fun get_no_pool(market: &Market): u64 {
        market.no_pool.value()
    }
    
    public fun is_resolved(market: &Market): bool {
        market.resolved
    }
    
    public fun get_resolution(market: &Market): bool {
        assert!(market.resolved, EMarketNotResolved);
        market.resolution
    }
    
    public fun get_question(market: &Market): String {
        market.question
    }
    
    public fun get_ticket_info(ticket: &ShareTicket): (ID, bool, u64) {
        (ticket.market_id, ticket.outcome, ticket.amount_paid)
    }
}